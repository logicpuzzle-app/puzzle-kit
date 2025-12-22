/**
 * Choco Banana (cbanana) Constraint Schema
 *
 * Extracted from pzprjs/src/variety/cbanana.js
 */

import type { ConstraintSchema } from '../types';

export const cbananaSchema: ConstraintSchema = {
  pid: 'cbanana',
  name: 'Choco Banana',
  nameKey: 'puzzle.cbanana',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'normal',

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
      id: 'cbanana.clue-numbers',
      scope: 'problem',
      title: 'constraint.cbanana.clueNumbers.title',
      description: 'constraint.cbanana.clueNumbers.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'cbanana' },
    },
  ],

  answer: [
    {
      id: 'cbanana.shade-cells',
      scope: 'answer',
      title: 'constraint.cbanana.shadeCells.title',
      description: 'constraint.cbanana.shadeCells.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade'],
      pzpr: { pid: 'cbanana' },
    },
  ],

  validation: [
    {
      id: 'cbanana.shade-rect',
      scope: 'validation',
      title: 'constraint.cbanana.shadeRect.title',
      description: 'constraint.cbanana.shadeRect.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'cbanana',
        checklist: ['checkShadeRect'],
        failcodes: ['csNotRect'],
      },
    },
    {
      id: 'cbanana.unshade-not-rect',
      scope: 'validation',
      title: 'constraint.cbanana.unshadeNotRect.title',
      description: 'constraint.cbanana.unshadeNotRect.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'cbanana',
        checklist: ['checkUnshadeNotRect'],
        failcodes: ['cuRect'],
      },
    },
    {
      id: 'cbanana.number-size',
      scope: 'validation',
      title: 'constraint.cbanana.numberSize.title',
      description: 'constraint.cbanana.numberSize.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'cbanana',
        checklist: ['checkNumberSize'],
        failcodes: ['bkSizeNe'],
      },
    },
  ],

  notes: [
    'Shaded blocks must be rectangles',
    'Unshaded blocks must not be rectangles',
    'Numbers match the size of the block containing the cell',
  ],
};
