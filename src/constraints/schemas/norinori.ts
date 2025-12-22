/**
 * Norinori Constraint Schema
 *
 * Extracted from pzprjs/src/variety/lits.js (norinori rules)
 */

import type { ConstraintSchema } from '../types';

export const norinoriSchema: ConstraintSchema = {
  pid: 'norinori',
  name: 'Norinori',
  nameKey: 'puzzle.norinori',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Auto mode types
  autoModeEdit: 'border-number',
  autoModePlay: 'cell',

  // Input modes
  inputModes: {
    edit: ['auto', 'border', 'clear', 'info-room'],
    play: ['auto', 'shade', 'unshade', 'info-blk'],
  },

  problem: [
    {
      id: 'norinori.rooms',
      scope: 'problem',
      title: 'constraint.norinori.rooms.title',
      description: 'constraint.norinori.rooms.description',
      targets: ['border'],
      states: ['border', 'none'],
      toolPalette: ['border', 'clear'],
      pzpr: { pid: 'norinori' },
    },
  ],

  answer: [
    {
      id: 'norinori.shade-cells',
      scope: 'answer',
      title: 'constraint.norinori.shadeCells.title',
      description: 'constraint.norinori.shadeCells.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade'],
      pzpr: { pid: 'norinori' },
    },
  ],

  validation: [
    {
      id: 'norinori.shade-block-max',
      scope: 'validation',
      title: 'constraint.norinori.shadeBlockMax.title',
      description: 'constraint.norinori.shadeBlockMax.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'norinori',
        checklist: ['checkOverShadeCell'],
        failcodes: ['csGt2'],
      },
    },
    {
      id: 'norinori.shade-block-min',
      scope: 'validation',
      title: 'constraint.norinori.shadeBlockMin.title',
      description: 'constraint.norinori.shadeBlockMin.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'norinori',
        checklist: ['checkSingleShadeCell'],
        failcodes: ['csLt2'],
      },
    },
    {
      id: 'norinori.room-shade-max',
      scope: 'validation',
      title: 'constraint.norinori.roomShadeMax.title',
      description: 'constraint.norinori.roomShadeMax.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'norinori',
        checklist: ['checkOverShadeCellInArea'],
        failcodes: ['bkShadeGt2'],
      },
    },
    {
      id: 'norinori.room-shade-min',
      scope: 'validation',
      title: 'constraint.norinori.roomShadeMin.title',
      description: 'constraint.norinori.roomShadeMin.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'norinori',
        checklist: ['checkSingleShadeCellInArea'],
        failcodes: ['bkShadeLt2'],
      },
    },
    {
      id: 'norinori.room-shade-required',
      scope: 'validation',
      title: 'constraint.norinori.roomShadeRequired.title',
      description: 'constraint.norinori.roomShadeRequired.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'norinori',
        checklist: ['checkNoShadeCellInArea'],
        failcodes: ['bkNoShade'],
      },
    },
  ],

  highlight: [
    {
      id: 'norinori.room-complete',
      scope: 'play',
      title: 'constraint.norinori.roomComplete.title',
      description: 'constraint.norinori.roomComplete.description',
      defaultOn: true,
    },
  ],

  notes: [
    'Each room contains exactly two shaded cells',
    'Each shaded block consists of exactly two cells',
  ],
};
