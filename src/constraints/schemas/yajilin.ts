/**
 * Yajilin Constraint Schema
 *
 * Extracted from pzprjs/src/variety/yajilin.js
 */

import type { ConstraintSchema } from '../types';

export const yajilinSchema: ConstraintSchema = {
  pid: 'yajilin',
  name: 'Yajilin',
  nameKey: 'puzzle.yajilin',
  grid: 'square',
  gridStyle: 'normal', // Yajilin uses normal grid style
  frameStyle: 'thick', // Yajilin uses thick frame

  // Shading constraint: Yajilin has noAdjacent shading rule
  noAdjacentShade: true,

  // Line target: Lines connect cell centers (not vertices like Slitherlink)
  lineTarget: 'cell',

  // Auto mode types based on pzprjs mouseinput_auto
  // Edit: directional number input
  // Play: left=line, right=shade/unshade
  autoModeEdit: 'direc',
  autoModePlay: 'line-cell',

  // Input modes from pzprjs/src/variety/yajilin.js
  inputModes: {
    edit: ['auto', 'number', 'direc', 'clear', 'info-line'],
    play: ['auto', 'line', 'peke', 'shade', 'unshade', 'info-line'],
  },

  problem: [
    {
      id: 'yajilin.arrow-number',
      scope: 'problem',
      title: 'constraint.yajilin.arrowNumber.title',
      description: 'constraint.yajilin.arrowNumber.description',
      targets: ['cell'],
      states: ['up', 'down', 'left', 'right'],
      toolPalette: ['number', 'direc', 'clear'],
      pzpr: { pid: 'yajilin' },
    },
  ],

  answer: [
    {
      id: 'yajilin.shade-cells',
      scope: 'answer',
      title: 'constraint.yajilin.shadeCells.title',
      description: 'constraint.yajilin.shadeCells.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade'],
      pzpr: { pid: 'yajilin' },
    },
    {
      id: 'yajilin.loop-draw',
      scope: 'answer',
      title: 'constraint.yajilin.loopDraw.title',
      description: 'constraint.yajilin.loopDraw.description',
      targets: ['edge'],
      states: ['line', 'peke', 'none'],
      toolPalette: ['line', 'peke'],
      pzpr: { pid: 'yajilin' },
    },
  ],

  validation: [
    {
      id: 'yajilin.no-branch',
      scope: 'validation',
      title: 'constraint.yajilin.noBranch.title',
      description: 'constraint.yajilin.noBranch.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'yajilin',
        checklist: ['checkBranchLine'],
        failcodes: ['lnBranch'],
      },
    },
    {
      id: 'yajilin.no-cross',
      scope: 'validation',
      title: 'constraint.yajilin.noCross.title',
      description: 'constraint.yajilin.noCross.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'yajilin',
        checklist: ['checkCrossLine'],
        failcodes: ['lnCross'],
      },
    },
    {
      id: 'yajilin.no-line-on-shade',
      scope: 'validation',
      title: 'constraint.yajilin.noLineOnShade.title',
      description: 'constraint.yajilin.noLineOnShade.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'yajilin',
        checklist: ['checkLineOnShadeCell'],
        failcodes: ['lnOnShade'],
      },
    },
    {
      id: 'yajilin.no-adjacent-shade',
      scope: 'validation',
      title: 'constraint.yajilin.noAdjacentShade.title',
      description: 'constraint.yajilin.noAdjacentShade.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'yajilin',
        checklist: ['checkAdjacentShadeCell'],
        failcodes: ['csAdjacent'],
      },
    },
    {
      id: 'yajilin.no-deadend',
      scope: 'validation',
      title: 'constraint.yajilin.noDeadend.title',
      description: 'constraint.yajilin.noDeadend.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'yajilin',
        checklist: ['checkDeadendLine'],
        failcodes: ['lnDeadEnd'],
      },
    },
    {
      id: 'yajilin.arrow-count',
      scope: 'validation',
      title: 'constraint.yajilin.arrowCount.title',
      description: 'constraint.yajilin.arrowCount.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'yajilin',
        checklist: ['checkArrowNumber'],
        failcodes: ['anShadeNe'],
      },
    },
    {
      id: 'yajilin.single-loop',
      scope: 'validation',
      title: 'constraint.yajilin.singleLoop.title',
      description: 'constraint.yajilin.singleLoop.description',
      targets: ['edge'],
      defaultOn: true,
      pzpr: {
        pid: 'yajilin',
        checklist: ['checkOneLoop'],
        failcodes: ['lnPlLoop'],
      },
    },
    {
      id: 'yajilin.no-empty-cell',
      scope: 'validation',
      title: 'constraint.yajilin.noEmptyCell.title',
      description: 'constraint.yajilin.noEmptyCell.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'yajilin',
        checklist: ['checkEmptyCell_yajilin'],
        failcodes: ['ceEmpty'],
      },
    },
  ],

  notes: [
    'Arrow numbers indicate shaded cells in that direction',
    'Shaded cells cannot be adjacent',
    'Form a single closed loop through unshaded cells',
  ],
};
