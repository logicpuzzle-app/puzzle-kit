/**
 * Simple Loop Constraint Schema
 *
 * Based on pzprjs/src/variety/country.js (simpleloop rules)
 */

import type { ConstraintSchema } from '../types';

export const simpleloopSchema: ConstraintSchema = {
  pid: 'simpleloop',
  name: 'Simple Loop',
  nameKey: 'puzzle.simpleloop',
  grid: 'square',
  gridStyle: 'dashed',
  frameStyle: 'normal',

  // Line target: Lines connect cell centers
  lineTarget: 'cell',

  // Auto mode types based on pzprjs mouseinput_auto
  autoModeEdit: 'line',
  autoModePlay: 'line',

  // Input modes from pzprjs/src/variety/country.js
  inputModes: {
    edit: ['empty', 'clear', 'info-line'],
    play: ['line', 'peke', 'clear', 'info-line'],
  },

  problem: [
    {
      id: 'simpleloop.empty-cells',
      scope: 'problem',
      title: 'constraint.simpleloop.emptyCells.title',
      description: 'constraint.simpleloop.emptyCells.description',
      targets: ['cell'],
      toolPalette: ['empty', 'clear'],
      pzpr: { pid: 'simpleloop' },
    },
  ],

  answer: [
    {
      id: 'simpleloop.loop-draw',
      scope: 'answer',
      title: 'constraint.simpleloop.loopDraw.title',
      description: 'constraint.simpleloop.loopDraw.description',
      targets: ['edge'],
      states: ['line', 'peke', 'none'],
      toolPalette: ['line', 'peke'],
      pzpr: { pid: 'simpleloop' },
    },
  ],

  validation: [
    {
      id: 'simpleloop.no-branch',
      scope: 'validation',
      title: 'constraint.simpleloop.noBranch.title',
      description: 'constraint.simpleloop.noBranch.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'simpleloop',
        checklist: ['checkLineBranch'],
        failcodes: ['lnBranch'],
      },
    },
    {
      id: 'simpleloop.no-cross',
      scope: 'validation',
      title: 'constraint.simpleloop.noCross.title',
      description: 'constraint.simpleloop.noCross.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'simpleloop',
        checklist: ['checkLineCross'],
        failcodes: ['lnCross'],
      },
    },
    {
      id: 'simpleloop.no-deadend',
      scope: 'validation',
      title: 'constraint.simpleloop.noDeadend.title',
      description: 'constraint.simpleloop.noDeadend.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'simpleloop',
        checklist: ['checkLineDeadend'],
        failcodes: ['lnDeadEnd'],
      },
    },
    {
      id: 'simpleloop.single-loop',
      scope: 'validation',
      title: 'constraint.simpleloop.singleLoop.title',
      description: 'constraint.simpleloop.singleLoop.description',
      targets: ['edge'],
      defaultOn: true,
      pzpr: {
        pid: 'simpleloop',
        checklist: ['checkLineOneLoop'],
        failcodes: ['lnPlLoop'],
      },
    },
    {
      id: 'simpleloop.no-empty-cell',
      scope: 'validation',
      title: 'constraint.simpleloop.noEmptyCell.title',
      description: 'constraint.simpleloop.noEmptyCell.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'simpleloop',
        checklist: ['checkNoLine'],
        failcodes: ['ceNoLine'],
      },
    },
  ],

  notes: [
    'Draw a single loop through all non-empty cells',
    'Lines cannot branch or cross',
  ],
};
