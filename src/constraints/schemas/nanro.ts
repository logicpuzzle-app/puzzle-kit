/**
 * Nanro Constraint Schema
 *
 * Extracted from pzprjs/src/variety/nanro.js
 */

import type { ConstraintSchema } from '../types';

export const nanroSchema: ConstraintSchema = {
  pid: 'nanro',
  name: 'Nanro',
  nameKey: 'puzzle.nanro',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Auto mode types
  autoModeEdit: 'border-number',
  autoModePlay: 'number',

  // Input modes
  inputModes: {
    edit: ['auto', 'border', 'number', 'clear', 'info-room'],
    play: ['auto', 'number', 'numexist', 'numblank', 'clear'],
  },

  problem: [
    {
      id: 'nanro.rooms',
      scope: 'problem',
      title: 'constraint.nanro.rooms.title',
      description: 'constraint.nanro.rooms.description',
      targets: ['border'],
      states: ['on', 'off'],
      toolPalette: ['border'],
      pzpr: { pid: 'nanro' },
    },
    {
      id: 'nanro.given-numbers',
      scope: 'problem',
      title: 'constraint.nanro.givenNumbers.title',
      description: 'constraint.nanro.givenNumbers.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'nanro' },
    },
  ],

  answer: [
    {
      id: 'nanro.fill-numbers',
      scope: 'answer',
      title: 'constraint.nanro.fillNumbers.title',
      description: 'constraint.nanro.fillNumbers.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'numexist', 'numblank', 'clear'],
      pzpr: { pid: 'nanro' },
    },
  ],

  validation: [
    {
      id: 'nanro.no-2x2',
      scope: 'validation',
      title: 'constraint.nanro.no2x2.title',
      description: 'constraint.nanro.no2x2.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nanro',
        checklist: ['check2x2NumberCell'],
        failcodes: ['nm2x2'],
      },
    },
    {
      id: 'nanro.no-adjacent-same',
      scope: 'validation',
      title: 'constraint.nanro.noAdjacentSame.title',
      description: 'constraint.nanro.noAdjacentSame.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nanro',
        checklist: ['checkSideAreaNumber'],
        failcodes: ['cbSameNum'],
      },
    },
    {
      id: 'nanro.single-number-per-room',
      scope: 'validation',
      title: 'constraint.nanro.singleNumberPerRoom.title',
      description: 'constraint.nanro.singleNumberPerRoom.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'nanro',
        checklist: ['checkNotMultiNum'],
        failcodes: ['bkPlNum'],
      },
    },
    {
      id: 'nanro.count-not-too-high',
      scope: 'validation',
      title: 'constraint.nanro.countNotTooHigh.title',
      description: 'constraint.nanro.countNotTooHigh.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'nanro',
        checklist: ['checkNumCountOver'],
        failcodes: ['nmCountGt'],
      },
    },
    {
      id: 'nanro.numbers-connected',
      scope: 'validation',
      title: 'constraint.nanro.numbersConnected.title',
      description: 'constraint.nanro.numbersConnected.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nanro',
        checklist: ['checkConnectNumber'],
        failcodes: ['nmDivide'],
      },
    },
    {
      id: 'nanro.count-not-too-low',
      scope: 'validation',
      title: 'constraint.nanro.countNotTooLow.title',
      description: 'constraint.nanro.countNotTooLow.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'nanro',
        checklist: ['checkNumCountLack'],
        failcodes: ['nmCountLt'],
      },
    },
    {
      id: 'nanro.no-empty-room',
      scope: 'validation',
      title: 'constraint.nanro.noEmptyRoom.title',
      description: 'constraint.nanro.noEmptyRoom.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'nanro',
        checklist: ['checkNoEmptyArea'],
        failcodes: ['bkNoNum'],
      },
    },
  ],

  notes: [
    'Fill some cells with numbers; other cells remain empty.',
    'All numbers in the same room must be identical.',
    'A number equals the count of numbered cells in its room.',
    'Numbered cells form one orthogonally connected group.',
    'Numbers cannot form a 2x2 block and equal numbers cannot touch across rooms.',
  ],
};
