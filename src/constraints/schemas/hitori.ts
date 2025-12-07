/**
 * Hitori Constraint Schema
 *
 * Extracted from pzprjs/src/variety/hitori.js
 */

import type { ConstraintSchema } from '../types';

export const hitoriSchema: ConstraintSchema = {
  pid: 'hitori',
  name: 'Hitori',
  nameKey: 'puzzle.hitori',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Shading constraint: No adjacent shade cells
  noAdjacentShade: true,

  // Auto mode types
  autoModeEdit: 'number',
  autoModePlay: 'cell',

  // Input modes
  inputModes: {
    edit: ['auto', 'number', 'clear', 'info-blk'],
    play: ['auto', 'shade', 'unshade', 'peke', 'info-blk'],
  },

  problem: [
    {
      id: 'hitori.numbers',
      scope: 'problem',
      title: 'constraint.hitori.numbers.title',
      description: 'constraint.hitori.numbers.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'hitori' },
    },
  ],

  answer: [
    {
      id: 'hitori.shade-cells',
      scope: 'answer',
      title: 'constraint.hitori.shadeCells.title',
      description: 'constraint.hitori.shadeCells.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade', 'peke'],
      pzpr: { pid: 'hitori' },
    },
  ],

  validation: [
    {
      id: 'hitori.no-adjacent-shade',
      scope: 'validation',
      title: 'constraint.hitori.noAdjacentShade.title',
      description: 'constraint.hitori.noAdjacentShade.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'hitori',
        checklist: ['checkAdjacentShadeCell'],
        failcodes: ['csAdjacent'],
      },
    },
    {
      id: 'hitori.unshade-connected',
      scope: 'validation',
      title: 'constraint.hitori.unshadeConnected.title',
      description: 'constraint.hitori.unshadeConnected.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'hitori',
        checklist: ['checkConnectUnshadeRB'],
        failcodes: ['cuDivide'],
      },
    },
    {
      id: 'hitori.no-duplicate-in-row-col',
      scope: 'validation',
      title: 'constraint.hitori.noDuplicateInRowCol.title',
      description: 'constraint.hitori.noDuplicateInRowCol.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'hitori',
        checklist: ['checkRowsColsSameQuesNumber'],
        failcodes: ['nmDupRow'],
      },
    },
  ],

  notes: [
    'Shade cells to eliminate duplicate numbers in rows/columns',
    'Shaded cells cannot be orthogonally adjacent',
    'Unshaded cells must form a single connected group',
  ],
};
