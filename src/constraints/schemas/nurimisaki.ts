/**
 * Nurimisaki Constraint Schema
 *
 * Extracted from pzprjs/src/variety/kurodoko.js (nurimisaki rules)
 */

import type { ConstraintSchema } from '../types';

export const nurimisakiSchema: ConstraintSchema = {
  pid: 'nurimisaki',
  name: 'Nurimisaki',
  nameKey: 'puzzle.nurimisaki',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'normal',

  // Auto mode types
  autoModeEdit: 'number',
  autoModePlay: 'cell',

  // Input modes
  inputModes: {
    edit: ['auto', 'number', 'clear', 'info-ublk'],
    play: ['auto', 'shade', 'unshade', 'info-ublk'],
  },

  problem: [
    {
      id: 'nurimisaki.clue-numbers',
      scope: 'problem',
      title: 'constraint.nurimisaki.clueNumbers.title',
      description: 'constraint.nurimisaki.clueNumbers.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'nurimisaki' },
    },
  ],

  answer: [
    {
      id: 'nurimisaki.shade-cells',
      scope: 'answer',
      title: 'constraint.nurimisaki.shadeCells.title',
      description: 'constraint.nurimisaki.shadeCells.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade'],
      pzpr: { pid: 'nurimisaki' },
    },
  ],

  validation: [
    {
      id: 'nurimisaki.shade-required',
      scope: 'validation',
      title: 'constraint.nurimisaki.shadeRequired.title',
      description: 'constraint.nurimisaki.shadeRequired.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nurimisaki',
        checklist: ['checkShadeCellExist'],
        failcodes: ['brNoShade'],
      },
    },
    {
      id: 'nurimisaki.no-2x2-shade',
      scope: 'validation',
      title: 'constraint.nurimisaki.no2x2Shade.title',
      description: 'constraint.nurimisaki.no2x2Shade.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nurimisaki',
        checklist: ['check2x2ShadeCell'],
        failcodes: ['cs2x2'],
      },
    },
    {
      id: 'nurimisaki.unshade-connected',
      scope: 'validation',
      title: 'constraint.nurimisaki.unshadeConnected.title',
      description: 'constraint.nurimisaki.unshadeConnected.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nurimisaki',
        checklist: ['checkConnectUnshade'],
        failcodes: ['cuDivide'],
      },
    },
    {
      id: 'nurimisaki.view-count',
      scope: 'validation',
      title: 'constraint.nurimisaki.viewCount.title',
      description: 'constraint.nurimisaki.viewCount.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nurimisaki',
        checklist: ['checkViewOfNumber'],
        failcodes: ['nmSumViewNe'],
      },
    },
    {
      id: 'nurimisaki.no-2x2-unshade',
      scope: 'validation',
      title: 'constraint.nurimisaki.no2x2Unshade.title',
      description: 'constraint.nurimisaki.no2x2Unshade.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nurimisaki',
        checklist: ['check2x2UnshadeCell'],
        failcodes: ['cu2x2'],
      },
    },
    {
      id: 'nurimisaki.circle-promontory',
      scope: 'validation',
      title: 'constraint.nurimisaki.circlePromontory.title',
      description: 'constraint.nurimisaki.circlePromontory.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nurimisaki',
        checklist: ['checkCirclePromontory'],
        failcodes: ['circleNotPromontory'],
      },
    },
    {
      id: 'nurimisaki.non-circle-not-promontory',
      scope: 'validation',
      title: 'constraint.nurimisaki.nonCirclePromontory.title',
      description: 'constraint.nurimisaki.nonCirclePromontory.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nurimisaki',
        checklist: ['checkNonCircleNotPromontory'],
        failcodes: ['nonCirclePromontory'],
      },
    },
  ],

  notes: [
    'Numbers equal the count of visible unshaded cells in four directions',
    'Unshaded cells must be connected and have no 2x2 blocks',
    'Every promontory (dead end) must contain a number',
  ],
};
