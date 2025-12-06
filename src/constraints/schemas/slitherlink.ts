/**
 * Slitherlink Constraint Schema
 *
 * Extracted from pzprjs/src/variety/slither.js
 */

import type { ConstraintSchema } from '../types';

export const slitherlinkSchema: ConstraintSchema = {
  pid: 'slither',
  name: 'Slitherlink',
  nameKey: 'puzzle.slitherlink',
  grid: 'square',
  gridStyle: 'dots', // Slitherlink uses dots grid style
  frameStyle: 'none', // Slitherlink has no frame

  // Input modes from pzprjs/src/variety/slither.js
  inputModes: {
    edit: ['number', 'clear', 'info-line'],
    play: ['line', 'peke', 'bgcolor', 'bgcolor1', 'bgcolor2', 'clear', 'info-line'],
  },

  problem: [
    {
      id: 'slither.clue-range',
      scope: 'problem',
      title: 'constraint.slither.clueRange.title',
      description: 'constraint.slither.clueRange.description',
      targets: ['cell'],
      states: ['0', '1', '2', '3', '?'],
      toolPalette: ['number'],
      pzpr: { pid: 'slither' },
    },
  ],

  answer: [
    {
      id: 'slither.loop-draw',
      scope: 'answer',
      title: 'constraint.slither.loopDraw.title',
      description: 'constraint.slither.loopDraw.description',
      targets: ['edge'],
      states: ['line', 'peke', 'none'],
      toolPalette: ['line', 'peke', 'bgcolor', 'clear'],
      pzpr: { pid: 'slither' },
    },
  ],

  validation: [
    {
      id: 'slither.line-exist',
      scope: 'validation',
      title: 'constraint.slither.lineExist.title',
      description: 'constraint.slither.lineExist.description',
      targets: ['edge'],
      defaultOn: true,
      pzpr: {
        pid: 'slither',
        checklist: ['checkLineExist'],
        failcodes: ['brNoLine'],
      },
    },
    {
      id: 'slither.no-branch',
      scope: 'validation',
      title: 'constraint.slither.noBranch.title',
      description: 'constraint.slither.noBranch.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'slither',
        checklist: ['checkBranchLine'],
        failcodes: ['lnBranch'],
      },
    },
    {
      id: 'slither.no-cross',
      scope: 'validation',
      title: 'constraint.slither.noCross.title',
      description: 'constraint.slither.noCross.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'slither',
        checklist: ['checkCrossLine'],
        failcodes: ['lnCross'],
      },
    },
    {
      id: 'slither.clue-count',
      scope: 'validation',
      title: 'constraint.slither.clueCount.title',
      description: 'constraint.slither.clueCount.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'slither',
        checklist: ['checkdir4BorderLine'],
        failcodes: ['nmLineNe'],
      },
    },
    {
      id: 'slither.single-loop',
      scope: 'validation',
      title: 'constraint.slither.singleLoop.title',
      description: 'constraint.slither.singleLoop.description',
      targets: ['edge'],
      defaultOn: true,
      pzpr: {
        pid: 'slither',
        checklist: ['checkOneLoop'],
        failcodes: ['lnPlLoop'],
      },
    },
    {
      id: 'slither.no-deadend',
      scope: 'validation',
      title: 'constraint.slither.noDeadend.title',
      description: 'constraint.slither.noDeadend.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'slither',
        checklist: ['checkDeadendLine'],
        failcodes: ['lnDeadEnd'],
      },
    },
  ],

  notes: [
    'Standard slitherlink rules',
    'Numbers 0-3 indicate adjacent line segments',
    'Form a single closed loop',
  ],
};
