/**
 * Simple Gako Constraint Schema
 *
 * Extracted from pzprjs/src/variety/simplegako.js
 */

import type { ConstraintSchema } from '../types';

export const simplegakoSchema: ConstraintSchema = {
  pid: 'simplegako',
  name: 'Simple Gako',
  nameKey: 'puzzle.simplegako',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Auto mode types
  autoModeEdit: 'number',
  autoModePlay: 'number',

  // Input modes
  inputModes: {
    edit: ['auto', 'number', 'clear'],
    play: ['auto', 'number', 'clear'],
  },

  problem: [
    {
      id: 'simplegako.given-numbers',
      scope: 'problem',
      title: 'constraint.simplegako.givenNumbers.title',
      description: 'constraint.simplegako.givenNumbers.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'simplegako' },
    },
  ],

  answer: [
    {
      id: 'simplegako.fill-numbers',
      scope: 'answer',
      title: 'constraint.simplegako.fillNumbers.title',
      description: 'constraint.simplegako.fillNumbers.description',
      targets: ['cell'],
      states: ['number'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'simplegako' },
    },
  ],

  validation: [
    {
      id: 'simplegako.count-too-many',
      scope: 'validation',
      title: 'constraint.simplegako.countTooMany.title',
      description: 'constraint.simplegako.countTooMany.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'simplegako',
        checklist: ['checkRowsColsTooManyNumber'],
        failcodes: ['nmCountGt'],
      },
    },
    {
      id: 'simplegako.count-not-enough',
      scope: 'validation',
      title: 'constraint.simplegako.countNotEnough.title',
      description: 'constraint.simplegako.countNotEnough.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'simplegako',
        checklist: ['checkRowsColsNotEnoughNumber'],
        failcodes: ['nmCountLt'],
      },
    },
    {
      id: 'simplegako.complete',
      scope: 'validation',
      title: 'constraint.simplegako.complete.title',
      description: 'constraint.simplegako.complete.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'simplegako',
        checklist: ['checkNoNumCell'],
        failcodes: ['ceNoNum'],
      },
    },
  ],

  notes: [
    'Fill every cell with a number.',
    'A number A means there are exactly A cells with number A in its row and column combined.',
  ],
};
