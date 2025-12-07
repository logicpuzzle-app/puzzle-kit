/**
 * Kakuro Constraint Schema
 *
 * Extracted from pzprjs/src/variety/kakuro.js
 */

import type { ConstraintSchema } from '../types';

export const kakuroSchema: ConstraintSchema = {
  pid: 'kakuro',
  name: 'Kakuro',
  nameKey: 'puzzle.kakuro',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Auto mode types
  autoModeEdit: 'number',
  autoModePlay: 'number',

  // Input modes
  inputModes: {
    edit: ['auto', 'clear', 'number'],
    play: ['auto', 'number', 'clear'],
  },

  problem: [
    {
      id: 'kakuro.clue-cells',
      scope: 'problem',
      title: 'constraint.kakuro.clueCells.title',
      description: 'constraint.kakuro.clueCells.description',
      targets: ['cell'],
      states: ['clue', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'kakuro' },
    },
  ],

  answer: [
    {
      id: 'kakuro.fill-numbers',
      scope: 'answer',
      title: 'constraint.kakuro.fillNumbers.title',
      description: 'constraint.kakuro.fillNumbers.description',
      targets: ['cell'],
      states: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'kakuro' },
    },
  ],

  validation: [
    {
      id: 'kakuro.no-duplicate-in-run',
      scope: 'validation',
      title: 'constraint.kakuro.noDuplicateInRun.title',
      description: 'constraint.kakuro.noDuplicateInRun.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'kakuro',
        checklist: ['checkSameNumberInLine'],
        failcodes: ['nmDupRow'],
      },
    },
    {
      id: 'kakuro.sum-match',
      scope: 'validation',
      title: 'constraint.kakuro.sumMatch.title',
      description: 'constraint.kakuro.sumMatch.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'kakuro',
        checklist: ['checkSumOfNumberInLine'],
        failcodes: ['nmSumRowNe'],
      },
    },
    {
      id: 'kakuro.complete',
      scope: 'validation',
      title: 'constraint.kakuro.complete.title',
      description: 'constraint.kakuro.complete.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'kakuro',
        checklist: ['checkNoNumCell'],
        failcodes: ['ceEmpty'],
      },
    },
  ],

  notes: [
    'Fill cells with numbers 1-9',
    'Each run sums to the clue number',
    'No repeated numbers in any run',
  ],
};
