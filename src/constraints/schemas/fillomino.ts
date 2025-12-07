/**
 * Fillomino Constraint Schema
 *
 * Extracted from pzprjs/src/variety/fillomino.js
 */

import type { ConstraintSchema } from '../types';

export const fillominoSchema: ConstraintSchema = {
  pid: 'fillomino',
  name: 'Fillomino',
  nameKey: 'puzzle.fillomino',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Auto mode types
  autoModeEdit: 'number',
  autoModePlay: 'number',

  // Input modes
  inputModes: {
    edit: ['auto', 'number', 'clear', 'info-room'],
    play: ['auto', 'number', 'border', 'subline', 'clear', 'info-room'],
  },

  problem: [
    {
      id: 'fillomino.clue-numbers',
      scope: 'problem',
      title: 'constraint.fillomino.clueNumbers.title',
      description: 'constraint.fillomino.clueNumbers.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'fillomino' },
    },
  ],

  answer: [
    {
      id: 'fillomino.fill-numbers',
      scope: 'answer',
      title: 'constraint.fillomino.fillNumbers.title',
      description: 'constraint.fillomino.fillNumbers.description',
      targets: ['cell'],
      states: ['number'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'fillomino' },
    },
    {
      id: 'fillomino.borders',
      scope: 'answer',
      title: 'constraint.fillomino.borders.title',
      description: 'constraint.fillomino.borders.description',
      targets: ['edge'],
      states: ['border', 'none'],
      toolPalette: ['border', 'subline'],
      pzpr: { pid: 'fillomino' },
    },
  ],

  validation: [
    {
      id: 'fillomino.region-size',
      scope: 'validation',
      title: 'constraint.fillomino.regionSize.title',
      description: 'constraint.fillomino.regionSize.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'fillomino',
        checklist: ['checkRegionSize'],
        failcodes: ['bkSizeNe'],
      },
    },
    {
      id: 'fillomino.no-adjacent-same',
      scope: 'validation',
      title: 'constraint.fillomino.noAdjacentSame.title',
      description: 'constraint.fillomino.noAdjacentSame.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'fillomino',
        checklist: ['checkAdjacentSameNumber'],
        failcodes: ['nmAdjacent'],
      },
    },
    {
      id: 'fillomino.complete',
      scope: 'validation',
      title: 'constraint.fillomino.complete.title',
      description: 'constraint.fillomino.complete.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'fillomino',
        checklist: ['checkEmptyCell'],
        failcodes: ['ceEmpty'],
      },
    },
  ],

  notes: [
    'Fill all cells with numbers',
    'Each connected region of same numbers has size equal to that number',
    'Different regions of same size cannot be adjacent',
  ],
};
