/**
 * Mashu (Pearl) Constraint Schema
 *
 * Extracted from pzprjs/src/variety/mashu.js
 */

import type { ConstraintSchema } from '../types';

export const mashuSchema: ConstraintSchema = {
  pid: 'mashu',
  name: 'Mashu',
  nameKey: 'puzzle.mashu',
  grid: 'square',
  gridStyle: 'normal', // Mashu uses normal grid style
  frameStyle: 'thick', // Mashu uses thick frame
  lineTarget: 'cell', // Lines go through cell centers

  // Input modes from pzprjs/src/variety/mashu.js
  inputModes: {
    edit: ['circle-shade', 'circle-unshade', 'clear', 'info-line'],
    play: ['line', 'peke', 'info-line'],
  },

  problem: [
    {
      id: 'mashu.circles',
      scope: 'problem',
      title: 'constraint.mashu.circles.title',
      description: 'constraint.mashu.circles.description',
      targets: ['cell'],
      states: ['white', 'black', 'none'],
      toolPalette: ['circle-shade', 'circle-unshade', 'clear'],
      pzpr: { pid: 'mashu' },
    },
  ],

  answer: [
    {
      id: 'mashu.loop-draw',
      scope: 'answer',
      title: 'constraint.mashu.loopDraw.title',
      description: 'constraint.mashu.loopDraw.description',
      targets: ['edge'],
      states: ['line', 'peke', 'none'],
      toolPalette: ['line', 'peke'],
      pzpr: { pid: 'mashu' },
    },
  ],

  validation: [
    {
      id: 'mashu.line-exist',
      scope: 'validation',
      title: 'constraint.mashu.lineExist.title',
      description: 'constraint.mashu.lineExist.description',
      targets: ['edge'],
      defaultOn: true,
      pzpr: {
        pid: 'mashu',
        checklist: ['checkLineExist'],
        failcodes: ['brNoLine'],
      },
    },
    {
      id: 'mashu.no-branch',
      scope: 'validation',
      title: 'constraint.mashu.noBranch.title',
      description: 'constraint.mashu.noBranch.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'mashu',
        checklist: ['checkLineBranch'],
        failcodes: ['lnBranch'],
      },
    },
    {
      id: 'mashu.no-cross',
      scope: 'validation',
      title: 'constraint.mashu.noCross.title',
      description: 'constraint.mashu.noCross.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'mashu',
        checklist: ['checkLineCross'],
        failcodes: ['lnCross'],
      },
    },
    {
      id: 'mashu.white-straight',
      scope: 'validation',
      title: 'constraint.mashu.whiteStraight.title',
      description: 'constraint.mashu.whiteStraight.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'mashu',
        checklist: ['checkWhitePearlStraight'],
        failcodes: ['mashuWCurve'],
      },
    },
    {
      id: 'mashu.black-turn',
      scope: 'validation',
      title: 'constraint.mashu.blackTurn.title',
      description: 'constraint.mashu.blackTurn.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'mashu',
        checklist: ['checkBlackPearlTurn'],
        failcodes: ['mashuBStrig'],
      },
    },
    {
      id: 'mashu.black-extend',
      scope: 'validation',
      title: 'constraint.mashu.blackExtend.title',
      description: 'constraint.mashu.blackExtend.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'mashu',
        checklist: ['checkBlackPearlExtend'],
        failcodes: ['mashuBCvNbr'],
      },
    },
    {
      id: 'mashu.white-turn-neighbor',
      scope: 'validation',
      title: 'constraint.mashu.whiteTurnNeighbor.title',
      description: 'constraint.mashu.whiteTurnNeighbor.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'mashu',
        checklist: ['checkWhitePearlTurnNeighbor'],
        failcodes: ['mashuWStNbr'],
      },
    },
    {
      id: 'mashu.pass-all-pearls',
      scope: 'validation',
      title: 'constraint.mashu.passAllPearls.title',
      description: 'constraint.mashu.passAllPearls.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'mashu',
        checklist: ['checkNoLinePearl'],
        failcodes: ['mashuOnLine'],
      },
    },
    {
      id: 'mashu.no-deadend',
      scope: 'validation',
      title: 'constraint.mashu.noDeadend.title',
      description: 'constraint.mashu.noDeadend.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'mashu',
        checklist: ['checkLineDeadend'],
        failcodes: ['lnDeadEnd'],
      },
    },
    {
      id: 'mashu.single-loop',
      scope: 'validation',
      title: 'constraint.mashu.singleLoop.title',
      description: 'constraint.mashu.singleLoop.description',
      targets: ['edge'],
      defaultOn: true,
      pzpr: {
        pid: 'mashu',
        checklist: ['checkLineOneLoop'],
        failcodes: ['lnPlLoop'],
      },
    },
  ],

  notes: [
    'White circles: line must go straight through, turn at least one neighbor',
    'Black circles: line must turn, go straight at least one cell each direction',
  ],
};
