/**
 * Nonogram (Picross) Constraint Schema
 *
 * Extracted from pzprjs/src/variety/nonogram.js
 */

import type { ConstraintSchema } from '../types';

export const nonogramSchema: ConstraintSchema = {
  pid: 'nonogram',
  name: 'Nonogram',
  nameKey: 'puzzle.nonogram',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Auto mode types
  autoModeEdit: 'number',
  autoModePlay: 'cell',

  // Input modes
  inputModes: {
    edit: ['auto', 'number', 'clear'],
    play: ['auto', 'shade', 'unshade', 'peke'],
  },

  problem: [
    {
      id: 'nonogram.row-clues',
      scope: 'problem',
      title: 'constraint.nonogram.rowClues.title',
      description: 'constraint.nonogram.rowClues.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'nonogram' },
    },
    {
      id: 'nonogram.col-clues',
      scope: 'problem',
      title: 'constraint.nonogram.colClues.title',
      description: 'constraint.nonogram.colClues.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'nonogram' },
    },
  ],

  answer: [
    {
      id: 'nonogram.shade-cells',
      scope: 'answer',
      title: 'constraint.nonogram.shadeCells.title',
      description: 'constraint.nonogram.shadeCells.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade', 'peke'],
      pzpr: { pid: 'nonogram' },
    },
  ],

  validation: [
    {
      id: 'nonogram.row-match',
      scope: 'validation',
      title: 'constraint.nonogram.rowMatch.title',
      description: 'constraint.nonogram.rowMatch.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nonogram',
        checklist: ['checkRowClue'],
        failcodes: ['exShadeNe'],
      },
    },
    {
      id: 'nonogram.col-match',
      scope: 'validation',
      title: 'constraint.nonogram.colMatch.title',
      description: 'constraint.nonogram.colMatch.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nonogram',
        checklist: ['checkColClue'],
        failcodes: ['exShadeNe'],
      },
    },
  ],

  notes: [
    'Shade cells to match row and column clues',
    'Clues indicate lengths of consecutive shaded groups',
    'Groups must be separated by at least one empty cell',
  ],
};
