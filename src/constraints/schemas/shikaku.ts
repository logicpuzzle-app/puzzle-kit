/**
 * Shikaku (Rectangles) Constraint Schema
 *
 * Extracted from pzprjs/src/variety/shikaku.js
 */

import type { ConstraintSchema } from '../types';

export const shikakuSchema: ConstraintSchema = {
  pid: 'shikaku',
  name: 'Shikaku',
  nameKey: 'puzzle.shikaku',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Auto mode types
  autoModeEdit: 'number',
  autoModePlay: 'cell', // drag to form rectangles

  // Input modes
  inputModes: {
    edit: ['auto', 'number', 'clear', 'info-room'],
    play: ['auto', 'border', 'subline', 'info-room'],
  },

  problem: [
    {
      id: 'shikaku.area-numbers',
      scope: 'problem',
      title: 'constraint.shikaku.areaNumbers.title',
      description: 'constraint.shikaku.areaNumbers.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'shikaku' },
    },
  ],

  answer: [
    {
      id: 'shikaku.rectangles',
      scope: 'answer',
      title: 'constraint.shikaku.rectangles.title',
      description: 'constraint.shikaku.rectangles.description',
      targets: ['edge'],
      states: ['border', 'none'],
      toolPalette: ['border', 'subline'],
      pzpr: { pid: 'shikaku' },
    },
  ],

  validation: [
    {
      id: 'shikaku.one-number-per-rectangle',
      scope: 'validation',
      title: 'constraint.shikaku.oneNumberPerRectangle.title',
      description: 'constraint.shikaku.oneNumberPerRectangle.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'shikaku',
        checklist: ['checkRoomOneNumber'],
        failcodes: ['bkNumGe2', 'bkNoNum'],
      },
    },
    {
      id: 'shikaku.rectangle-shape',
      scope: 'validation',
      title: 'constraint.shikaku.rectangleShape.title',
      description: 'constraint.shikaku.rectangleShape.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'shikaku',
        checklist: ['checkRoomRect'],
        failcodes: ['bkNotRect'],
      },
    },
    {
      id: 'shikaku.area-match',
      scope: 'validation',
      title: 'constraint.shikaku.areaMatch.title',
      description: 'constraint.shikaku.areaMatch.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'shikaku',
        checklist: ['checkRoomSize'],
        failcodes: ['bkSizeNe'],
      },
    },
    {
      id: 'shikaku.complete',
      scope: 'validation',
      title: 'constraint.shikaku.complete.title',
      description: 'constraint.shikaku.complete.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'shikaku',
        checklist: ['checkDividedRoom'],
        failcodes: ['ceNoArea'],
      },
    },
  ],

  notes: [
    'Divide the grid into rectangles',
    'Each rectangle contains exactly one number',
    'The number indicates the area of the rectangle',
  ],
};
