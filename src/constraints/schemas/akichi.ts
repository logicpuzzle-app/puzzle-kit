/**
 * Akichi Constraint Schema
 *
 * Based on pzprjs/src/variety/heyawake.js (akichi rules)
 */

import type { ConstraintSchema } from '../types';

export const akichiSchema: ConstraintSchema = {
  pid: 'akichi',
  name: 'Akichi',
  nameKey: 'puzzle.akichi',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Shading constraint: prevent shading adjacent cells (pzprjs: RBShadeCell)
  noAdjacentShade: true,

  // Auto mode types based on pzprjs mouseinput_auto
  autoModeEdit: 'border-number',
  autoModePlay: 'cell',

  // Input modes from pzprjs/src/variety/heyawake.js
  inputModes: {
    edit: ['auto', 'border', 'number', 'clear', 'info-blk'],
    play: ['auto', 'shade', 'unshade', 'info-blk'],
  },

  problem: [
    {
      id: 'akichi.rooms',
      scope: 'problem',
      title: 'constraint.akichi.rooms.title',
      description: 'constraint.akichi.rooms.description',
      targets: ['border'],
      states: ['on', 'off'],
      toolPalette: ['border'],
      pzpr: { pid: 'akichi' },
    },
    {
      id: 'akichi.room-number',
      scope: 'problem',
      title: 'constraint.akichi.roomNumber.title',
      description: 'constraint.akichi.roomNumber.description',
      targets: ['cell'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'akichi' },
    },
  ],

  answer: [
    {
      id: 'akichi.shading',
      scope: 'answer',
      title: 'constraint.akichi.shading.title',
      description: 'constraint.akichi.shading.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade'],
      pzpr: { pid: 'akichi' },
    },
  ],

  validation: [
    {
      id: 'akichi.no-adjacent-shade',
      scope: 'validation',
      title: 'constraint.akichi.noAdjacentShade.title',
      description: 'constraint.akichi.noAdjacentShade.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'akichi',
        checklist: ['checkAdjacentShadeCell'],
        failcodes: ['csAdjacent'],
      },
    },
    {
      id: 'akichi.white-connected',
      scope: 'validation',
      title: 'constraint.akichi.whiteConnected.title',
      description: 'constraint.akichi.whiteConnected.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'akichi',
        checklist: ['checkConnectUnshadeRB'],
        failcodes: ['cuDivide'],
      },
    },
    {
      id: 'akichi.room-max-attained',
      scope: 'validation',
      title: 'constraint.akichi.roomMaxAttained.title',
      description: 'constraint.akichi.roomMaxAttained.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'akichi',
        checklist: ['checkAttainedSize'],
        failcodes: ['cuRoomLt'],
      },
    },
    {
      id: 'akichi.room-max-limit',
      scope: 'validation',
      title: 'constraint.akichi.roomMaxLimit.title',
      description: 'constraint.akichi.roomMaxLimit.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'akichi',
        checklist: ['checkUnshadedSize'],
        failcodes: ['cuRoomGt'],
      },
    },
    {
      id: 'akichi.no-straight-through',
      scope: 'validation',
      title: 'constraint.akichi.noStraightThrough.title',
      description: 'constraint.akichi.noStraightThrough.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'akichi',
        checklist: ['checkCountinuousUnshadeCell'],
        failcodes: ['cuBorderGe3'],
      },
    },
  ],

  notes: [
    'Shade cells so that black cells are not orthogonally adjacent',
    'All white cells must be connected',
    'Each number is the maximum size of a connected unshaded area in that room',
    'A straight line of white cells cannot cross two or more room boundaries without a black cell',
  ],
};
