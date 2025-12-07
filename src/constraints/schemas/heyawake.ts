/**
 * Heyawake Constraint Schema
 *
 * Based on pzprjs/src/variety/heyawake.js
 */

import type { ConstraintSchema } from '../types';

export const heyawakeSchema: ConstraintSchema = {
  pid: 'heyawake',
  name: 'Heyawake',
  nameKey: 'puzzle.heyawake',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Shading constraint: prevent shading adjacent cells (pzprjs: RBShadeCell)
  noAdjacentShade: true,

  // Auto mode types based on pzprjs mouseinput_auto
  // Edit: drag=border, click=number
  // Play: shade/unshade cycle
  autoModeEdit: 'border-number',
  autoModePlay: 'cell',

  // Input modes from pzprjs/src/variety/heyawake.js
  inputModes: {
    edit: ['auto', 'border', 'number', 'clear', 'info-blk'],
    play: ['auto', 'shade', 'unshade', 'info-blk'],
  },

  problem: [
    {
      id: 'heyawake.rooms',
      scope: 'problem',
      title: 'constraint.heyawake.rooms.title',
      description: 'constraint.heyawake.rooms.description',
      targets: ['border'],
      states: ['on', 'off'],
      toolPalette: ['border'],
      pzpr: { pid: 'heyawake' },
    },
    {
      id: 'heyawake.room-number',
      scope: 'problem',
      title: 'constraint.heyawake.roomNumber.title',
      description: 'constraint.heyawake.roomNumber.description',
      targets: ['cell'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'heyawake' },
    },
  ],

  answer: [
    {
      id: 'heyawake.shading',
      scope: 'answer',
      title: 'constraint.heyawake.shading.title',
      description: 'constraint.heyawake.shading.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade'],
      pzpr: { pid: 'heyawake' },
    },
  ],

  validation: [
    {
      id: 'heyawake.no-adjacent-shade',
      scope: 'validation',
      title: 'constraint.heyawake.noAdjacentShade.title',
      description: 'constraint.heyawake.noAdjacentShade.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'heyawake',
        checklist: ['checkAdjacentShadeCell'],
      },
    },
    {
      id: 'heyawake.white-connected',
      scope: 'validation',
      title: 'constraint.heyawake.whiteConnected.title',
      description: 'constraint.heyawake.whiteConnected.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'heyawake',
        checklist: ['checkConnectUnshadeRB'],
      },
    },
    {
      id: 'heyawake.room-shade-count',
      scope: 'validation',
      title: 'constraint.heyawake.roomShadeCount.title',
      description: 'constraint.heyawake.roomShadeCount.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'heyawake',
        checklist: ['checkShadeCellCount'],
      },
    },
    {
      id: 'heyawake.no-straight-through',
      scope: 'validation',
      title: 'constraint.heyawake.noStraightThrough.title',
      description: 'constraint.heyawake.noStraightThrough.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'heyawake',
        checklist: ['checkCountinuousUnshadeCell'],
      },
    },
  ],

  notes: [
    'Shade cells so that black cells are not orthogonally adjacent',
    'All white cells must be connected',
    'Numbers indicate shaded cells in that room',
    'A straight line of white cells cannot cross two or more room boundaries without a black cell',
  ],
};
