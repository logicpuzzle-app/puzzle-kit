/**
 * Ayeheya Constraint Schema
 *
 * Based on pzprjs/src/variety/heyawake.js (ayeheya rules)
 */

import type { ConstraintSchema } from '../types';

export const ayeheyaSchema: ConstraintSchema = {
  pid: 'ayeheya',
  name: 'Ayeheya',
  nameKey: 'puzzle.ayeheya',
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
      id: 'ayeheya.rooms',
      scope: 'problem',
      title: 'constraint.ayeheya.rooms.title',
      description: 'constraint.ayeheya.rooms.description',
      targets: ['border'],
      states: ['on', 'off'],
      toolPalette: ['border'],
      pzpr: { pid: 'ayeheya' },
    },
    {
      id: 'ayeheya.room-number',
      scope: 'problem',
      title: 'constraint.ayeheya.roomNumber.title',
      description: 'constraint.ayeheya.roomNumber.description',
      targets: ['cell'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'ayeheya' },
    },
  ],

  answer: [
    {
      id: 'ayeheya.shading',
      scope: 'answer',
      title: 'constraint.ayeheya.shading.title',
      description: 'constraint.ayeheya.shading.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade'],
      pzpr: { pid: 'ayeheya' },
    },
  ],

  validation: [
    {
      id: 'ayeheya.no-adjacent-shade',
      scope: 'validation',
      title: 'constraint.ayeheya.noAdjacentShade.title',
      description: 'constraint.ayeheya.noAdjacentShade.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'ayeheya',
        checklist: ['checkAdjacentShadeCell'],
        failcodes: ['csAdjacent'],
      },
    },
    {
      id: 'ayeheya.white-connected',
      scope: 'validation',
      title: 'constraint.ayeheya.whiteConnected.title',
      description: 'constraint.ayeheya.whiteConnected.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'ayeheya',
        checklist: ['checkConnectUnshadeRB'],
        failcodes: ['cuDivide'],
      },
    },
    {
      id: 'ayeheya.shade-symmetry',
      scope: 'validation',
      title: 'constraint.ayeheya.shadeSymmetry.title',
      description: 'constraint.ayeheya.shadeSymmetry.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'ayeheya',
        checklist: ['checkFractal'],
        failcodes: ['bkNotSymShade'],
      },
    },
    {
      id: 'ayeheya.room-shade-count',
      scope: 'validation',
      title: 'constraint.ayeheya.roomShadeCount.title',
      description: 'constraint.ayeheya.roomShadeCount.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'ayeheya',
        checklist: ['checkShadeCellCount'],
        failcodes: ['nmShadeNe'],
      },
    },
    {
      id: 'ayeheya.no-straight-through',
      scope: 'validation',
      title: 'constraint.ayeheya.noStraightThrough.title',
      description: 'constraint.ayeheya.noStraightThrough.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'ayeheya',
        checklist: ['checkCountinuousUnshadeCell'],
        failcodes: ['cuBorderGe3'],
      },
    },
    {
      id: 'ayeheya.room-symmetry',
      scope: 'validation',
      title: 'constraint.ayeheya.roomSymmetry.title',
      description: 'constraint.ayeheya.roomSymmetry.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'ayeheya',
        checklist: ['checkRoomSymm'],
        failcodes: ['bkNotSymRoom'],
      },
    },
  ],

  notes: [
    'Shade cells so that black cells are not orthogonally adjacent',
    'All white cells must be connected',
    'Numbers indicate shaded cells in that room',
    'Shaded cells in each room are point symmetric',
    'Each room shape is point symmetric',
    'A straight line of white cells cannot cross two or more room boundaries without a black cell',
  ],
};
