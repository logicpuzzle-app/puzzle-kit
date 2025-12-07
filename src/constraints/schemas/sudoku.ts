/**
 * Sudoku Constraint Schema
 *
 * Extracted from pzprjs/src/variety/sudoku.js
 */

import type { ConstraintSchema } from '../types';

export const sudokuSchema: ConstraintSchema = {
  pid: 'sudoku',
  name: 'Sudoku',
  nameKey: 'puzzle.sudoku',
  grid: 'square',
  gridStyle: 'sudoku', // 3x3 box borders
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
      id: 'sudoku.given-numbers',
      scope: 'problem',
      title: 'constraint.sudoku.givenNumbers.title',
      description: 'constraint.sudoku.givenNumbers.description',
      targets: ['cell'],
      states: ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'sudoku' },
    },
  ],

  answer: [
    {
      id: 'sudoku.fill-numbers',
      scope: 'answer',
      title: 'constraint.sudoku.fillNumbers.title',
      description: 'constraint.sudoku.fillNumbers.description',
      targets: ['cell'],
      states: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'sudoku' },
    },
  ],

  validation: [
    {
      id: 'sudoku.row-unique',
      scope: 'validation',
      title: 'constraint.sudoku.rowUnique.title',
      description: 'constraint.sudoku.rowUnique.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'sudoku',
        checklist: ['checkRowNumber'],
        failcodes: ['nmDupRow'],
      },
    },
    {
      id: 'sudoku.column-unique',
      scope: 'validation',
      title: 'constraint.sudoku.columnUnique.title',
      description: 'constraint.sudoku.columnUnique.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'sudoku',
        checklist: ['checkColNumber'],
        failcodes: ['nmDupCol'],
      },
    },
    {
      id: 'sudoku.box-unique',
      scope: 'validation',
      title: 'constraint.sudoku.boxUnique.title',
      description: 'constraint.sudoku.boxUnique.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'sudoku',
        checklist: ['checkBlockNumber'],
        failcodes: ['nmDupBlk'],
      },
    },
    {
      id: 'sudoku.complete',
      scope: 'validation',
      title: 'constraint.sudoku.complete.title',
      description: 'constraint.sudoku.complete.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'sudoku',
        checklist: ['checkEmptyCell'],
        failcodes: ['ceEmpty'],
      },
    },
  ],

  notes: [
    'Fill each cell with a number 1-9',
    'Each row contains each number exactly once',
    'Each column contains each number exactly once',
    'Each 3x3 box contains each number exactly once',
  ],
};
