/**
 * Akari (Light Up) Constraint Schema
 *
 * Extracted from pzprjs/src/variety/lightup.js
 */

import type { ConstraintSchema } from '../types';

export const akariSchema: ConstraintSchema = {
  pid: 'lightup',
  name: 'Akari (Light Up)',
  nameKey: 'puzzle.akari',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Auto mode types
  autoModeEdit: 'number',
  autoModePlay: 'cell',

  // Input modes
  inputModes: {
    edit: ['auto', 'number', 'shade', 'clear', 'info-blk'],
    play: ['auto', 'circle-unshade', 'subcross', 'info-blk'],
  },

  problem: [
    {
      id: 'akari.wall-numbers',
      scope: 'problem',
      title: 'constraint.akari.wallNumbers.title',
      description: 'constraint.akari.wallNumbers.description',
      targets: ['cell'],
      states: ['wall', 'wall-0', 'wall-1', 'wall-2', 'wall-3', 'wall-4', 'none'],
      toolPalette: ['number', 'shade', 'clear'],
      pzpr: { pid: 'lightup' },
    },
  ],

  answer: [
    {
      id: 'akari.place-lights',
      scope: 'answer',
      title: 'constraint.akari.placeLights.title',
      description: 'constraint.akari.placeLights.description',
      targets: ['cell'],
      states: ['light', 'none'],
      toolPalette: ['circle-unshade', 'subcross'],
      pzpr: { pid: 'lightup' },
    },
  ],

  validation: [
    {
      id: 'akari.no-light-conflict',
      scope: 'validation',
      title: 'constraint.akari.noLightConflict.title',
      description: 'constraint.akari.noLightConflict.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'lightup',
        checklist: ['checkLightConflict'],
        failcodes: ['nmIllumi'],
      },
    },
    {
      id: 'akari.all-cells-lit',
      scope: 'validation',
      title: 'constraint.akari.allCellsLit.title',
      description: 'constraint.akari.allCellsLit.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'lightup',
        checklist: ['checkUnlit'],
        failcodes: ['ceUnlit'],
      },
    },
    {
      id: 'akari.wall-number-count',
      scope: 'validation',
      title: 'constraint.akari.wallNumberCount.title',
      description: 'constraint.akari.wallNumberCount.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'lightup',
        checklist: ['checkWallNumberNe'],
        failcodes: ['nmLightNe'],
      },
    },
  ],

  highlight: [
    {
      id: 'akari.light-beams',
      scope: 'play',
      title: 'constraint.akari.lightBeams.title',
      description: 'constraint.akari.lightBeams.description',
      defaultOn: true,
    },
  ],

  notes: [
    'Place lights to illuminate all cells',
    'Lights illuminate horizontally and vertically until blocked by walls',
    'Lights cannot see each other',
    'Wall numbers indicate adjacent lights',
  ],
};
